<?php

namespace Drupal\image_auto_tagging\Plugin\EntityBrowser\Widget;

use Drupal\Core\Form\FormStateInterface;
use Drupal\dropzonejs_eb_widget\Plugin\EntityBrowser\Widget\InlineEntityFormMediaWidget;

/**
 * Provides an Entity Browser widget that upload files with auto tagging.
 *
 * @EntityBrowserWidget(
 *   id = "image_auto_tagging_widget",
 *   label = @Translation("Image auto tagging"),
 *   description = @Translation("Image auto tagging to DropzoneJS upload."),
 *   auto_select = FALSE
 * )
 */
class ImageAutoTaggingWidget extends InlineEntityFormMediaWidget {

  /**
   * {@inheritdoc}
   */
  public function defaultConfiguration() {
    $default_config = parent::defaultConfiguration();

    $default_config['model_name'] = '';

    return $default_config;
  }

  /**
   * {@inheritdoc}
   */
  public function getForm(array &$original_form, FormStateInterface $form_state, array $additional_widget_parameters) {
    $form = parent::getForm($original_form, $form_state, $additional_widget_parameters);

    $form['#attached']['library'][] = 'image_auto_tagging/image_auto_tagging';
    $form['#attached']['drupalSettings']['image_auto_tagging']['path'] = drupal_get_path('module', 'image_auto_tagging');
    $form['#attached']['drupalSettings']['image_auto_tagging']['model'] = $this->configuration['model_name'];

    return $form;
  }

  /**
   * {@inheritdoc}
   */
  public function buildConfigurationForm(array $form, FormStateInterface $form_state) {
    $form = parent::buildConfigurationForm($form, $form_state);

    $form['model_name'] = [
      '#type' => 'textfield',
      '#title' => $this->t('Classification model'),
      '#default_value' => $this->configuration['model_name'],
    ];

    return $form;
  }

}
